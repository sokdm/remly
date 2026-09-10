import { db } from './db';
import { Exam, ExamAttempt, NotificationItem } from '../src/types';
import { awardStudentXP } from './xpService';
import { sendRemlyEmail } from './emailService';

export async function getAllExams(): Promise<Exam[]> {
  return db.exams.find();
}

export async function getExamById(id: string): Promise<Exam | null> {
  return db.exams.findOne({ id });
}

export async function startExamAttempt(examId: string, studentUid: string): Promise<ExamAttempt> {
  const student = await db.users.findOne({ uid: studentUid });
  if (student && student.academicRestricted) {
    throw new Error('Academic restriction in place due to repeated missed exams. Please submit an explanation to Academic Compliance or contact Admin.');
  }

  const exam = await db.exams.findOne({ id: examId });
  if (!exam) throw new Error('Exam not found');

  const priorAttempts = await db.examAttempts.find({ examId, studentUid });
  const attemptNumber = priorAttempts.length + 1;

  const attempt: ExamAttempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    examId,
    examTitle: exam.title,
    studentUid,
    answers: {},
    totalPoints: exam.totalPoints,
    passingScore: exam.passingScore,
    status: 'in_progress',
    startTime: new Date().toISOString(),
    attemptNumber,
    tabSwitches: 0,
    interruptionFlags: [],
  };

  await db.examAttempts.insertOne(attempt);
  return attempt;
}

export async function recordExamEvent(
  attemptId: string,
  studentUid: string,
  eventType: 'tab_switch' | 'interruption' | 'blur',
  details?: string
): Promise<boolean> {
  const attempt = await db.examAttempts.findOne({ id: attemptId, studentUid });
  if (!attempt || attempt.status !== 'in_progress') return false;

  const updatePayload: any = {};
  if (eventType === 'tab_switch') {
    updatePayload.$inc = { tabSwitches: 1 };
  }
  const flag = `${new Date().toLocaleTimeString()}: ${eventType.toUpperCase()} - ${details || 'Window lost focus'}`;
  const existingFlags = attempt.interruptionFlags || [];
  existingFlags.push(flag);

  await db.examAttempts.updateOne({ id: attemptId }, { interruptionFlags: existingFlags });
  return true;
}

export async function submitExamAttempt(
  attemptId: string,
  studentUid: string,
  answers: Record<string, string>
): Promise<ExamAttempt> {
  const attempt = await db.examAttempts.findOne({ id: attemptId, studentUid });
  if (!attempt) throw new Error('Exam attempt not found');

  const exam = await db.exams.findOne({ id: attempt.examId });
  if (!exam) throw new Error('Exam details not found');

  // Grade multiple-choice and short answer questions
  let earnedPoints = 0;
  for (const q of exam.questions) {
    const studentAnswer = (answers[q.id] || '').trim().toLowerCase();
    const correctAnswer = (q.correctAnswer || '').trim().toLowerCase();

    if (q.type === 'multiple_choice') {
      if (studentAnswer === correctAnswer) {
        earnedPoints += q.points;
      }
    } else if (q.type === 'short_answer') {
      if (studentAnswer.includes(correctAnswer) || correctAnswer.includes(studentAnswer)) {
        earnedPoints += q.points;
      }
    } else {
      // Written / subjective questions receive base partial credit
      if (studentAnswer.length > 20) {
        earnedPoints += Math.floor(q.points * 0.85);
      }
    }
  }

  const scorePercentage = Math.round((earnedPoints / exam.totalPoints) * 100);
  const passed = scorePercentage >= exam.passingScore;

  let xpAwarded = 100; // completion XP
  if (passed) {
    xpAwarded += 150; // pass bonus
  }

  // Award XP securely on backend
  await awardStudentXP(studentUid, xpAwarded, `Completed Exam: "${exam.title}" (${scorePercentage}%)`);

  const updatedAttempt: ExamAttempt = {
    ...attempt,
    answers,
    score: scorePercentage,
    percentage: scorePercentage,
    status: passed ? 'passed' : 'failed',
    submissionTime: new Date().toISOString(),
    feedback: passed
      ? `Exceptional grasp of ${exam.course}. You demonstrated solid conceptual clarity and accuracy.`
      : `Review foundational concepts for ${exam.course}. Your AI Tutor can build a personalized review session for weak areas.`,
    xpEarned: xpAwarded,
  };

  await db.examAttempts.updateOne({ id: attemptId }, updatedAttempt);

  // Send in-app notification
  await db.notifications.insertOne({
    id: `notif_${Date.now()}_result`,
    userUid: studentUid,
    type: 'exam_result',
    title: `Exam Graded: ${exam.title}`,
    message: `${passed ? 'Passed 🎉' : 'Completed'} with score ${scorePercentage}%. +${xpAwarded} XP awarded!`,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: `/student/exams`,
  });

  // Send email result
  const student = await db.users.findOne({ uid: studentUid });
  if (student && student.email) {
    await sendRemlyEmail({
      to: student.email,
      subject: `Exam Graded: ${exam.title}`,
      template: 'exam_result',
      data: {
        name: student.fullName,
        examTitle: exam.title,
        score: scorePercentage,
        passed,
        xpEarned: xpAwarded,
      },
    });
  }

  return updatedAttempt;
}

export async function getStudentExamAttempts(studentUid: string): Promise<ExamAttempt[]> {
  const attempts = await db.examAttempts.find({ studentUid });
  return attempts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// Academic compliance: Record missed exam
export async function recordMissedExam(examId: string, studentUid: string) {
  const student = await db.users.findOne({ uid: studentUid });
  if (!student) return;

  const newCount = (student.missedExamsCount || 0) + 1;
  const restrict = newCount >= 3;

  await db.users.updateOne(
    { uid: studentUid },
    {
      missedExamsCount: newCount,
      academicRestricted: restrict,
    }
  );

  await db.notifications.insertOne({
    id: `notif_${Date.now()}_missed`,
    userUid: studentUid,
    type: 'security_alert',
    title: `Academic Compliance Notice: Missed Exam`,
    message: `You missed a scheduled exam deadline. Missed exam count: ${newCount}/3.${
      restrict ? ' Your exam privileges are temporarily restricted. Please contact Academic Review.' : ' Please complete your next assessment on time.'
    }`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
