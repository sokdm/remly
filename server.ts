import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import {
  generateRemlyUID,
  generateOTP,
  hashPassword,
  comparePassword,
  signToken,
  requireAuth,
  requireRole,
  AuthRequest,
} from './server/auth';
import {
  generateTutorGreeting,
  streamTutorChat,
  generateExamForTopic,
  fetchRelevantMemories,
  solveAssignmentFromImage,
} from './server/aiService';
import { awardStudentXP } from './server/xpService';
import { synthesizeTutorSpeech } from './server/voiceService';
import { sendRemlyEmail } from './server/emailService';
import { scheduleClass, getStudentClasses, cancelClass, startClassReminderScheduler } from './server/classService';
import {
  getAllExams,
  getExamById,
  startExamAttempt,
  recordExamEvent,
  submitExamAttempt,
  getStudentExamAttempts,
} from './server/examService';
import { generateCreatorImage, getCreatorHistory, deleteCreatorImage } from './server/creatorService';
import { getAdminPlatformStats, suspendUserAccount, restoreUserAccount, searchUsers } from './server/adminService';
import {
  ensureDefaultCommunities,
  getUserCommunities,
  createCommunity,
  addMemberByUid,
  removeMember,
  requestToJoinCommunity,
  reviewJoinRequest,
  updateCommunitySettings,
  getCommunityMessages,
  sendCommunityMessage,
  toggleMessageReaction,
} from './server/communityService';
import { REMLY_CONFIG } from './src/config/remlyConfig';
import { User } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for uploaded homework images/diagrams
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Security & CORS Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ----------------------------------------------------
// 1. HEALTH & METADATA
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: REMLY_CONFIG.appName,
    version: REMLY_CONFIG.version,
    databaseMode: db.isAtlas() ? 'MongoDB Atlas' : 'Local Resilient Store',
    aiTutorName: REMLY_CONFIG.aiTutorName,
  });
});

// ----------------------------------------------------
// 2. AUTHENTICATION & REGISTRATION
// ----------------------------------------------------

// Register Student or Creator
app.post('/api/auth/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, password, username, role, age, country, countryCode } = req.body;

    if (!fullName || !email || !password || !username || !role) {
      return res.status(400).json({ error: 'Please provide all required registration fields.' });
    }

    if (!['student', 'creator'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either student or creator.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Enforce uniqueness on the database/backend
    const existingUsername = await db.users.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(409).json({ error: 'That username is already taken. Please choose another.' });
    }

    const existingEmail = await db.users.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with that email address already exists.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Generate unique immutable UID
    const uid = generateRemlyUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser: User = {
      id: `usr_${Date.now()}`,
      uid,
      email: cleanEmail,
      username: cleanUsername,
      fullName: fullName.trim(),
      role,
      age: age ? Number(age) : undefined,
      country: country || 'United States',
      countryCode: countryCode || 'US',
      avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${cleanUsername}`,
      isEmailVerified: true, // Default verified for smooth demo experience
      isSuspended: false,
      missedExamsCount: 0,
      academicRestricted: false,
      createdAt: now,
      updatedAt: now,
      level: 1,
      xp: 0,
      learningStreak: 1,
    };

    await db.users.insertOne({ ...newUser, passwordHash });

    // Send Welcome Email
    const otp = generateOTP();
    await sendRemlyEmail({
      to: cleanEmail,
      subject: `Welcome to Remly, ${fullName}!`,
      template: 'verification',
      data: { name: fullName, role, otp },
    });

    const token = signToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: newUser,
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Something went wrong creating your account. Please try again.' });
  }
});

// Check Username Availability
app.get('/api/auth/check-username', async (req: Request, res: Response): Promise<any> => {
  const username = (req.query.username as string || '').trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ error: 'Username query parameter is required.' });
  }
  const existing = await db.users.findOne({ username });
  return res.json({ available: !existing });
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await db.users.findOne((u: any) => u.email === cleanIdentifier || u.username === cleanIdentifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your username/email and password.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        error: `Account suspended. Reason: ${user.suspensionReason || 'Academic/Administrative hold'}. Duration: ${user.suspensionDuration || 'Indefinite'}.`,
        isSuspended: true,
      });
    }

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
    }

    const token = signToken(user);
    const { passwordHash, ...safeUser } = user;

    return res.json({
      token,
      user: safeUser,
      message: 'Logged in successfully!',
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Failed to process login. Please try again.' });
  }
});

// Forgot Password -> Send OTP
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Please provide your account email.' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.users.findOne({ email: cleanEmail });
    if (!user) {
      // Return success with friendly message to avoid user enumeration
      return res.json({ message: 'If an account with that email exists, an OTP code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    await db.otpRecords.insertOne({
      email: cleanEmail,
      otp,
      expiresAt,
      verified: false,
      createdAt: new Date().toISOString(),
    });

    await sendRemlyEmail({
      to: cleanEmail,
      subject: 'Your Remly Password Reset Code',
      template: 'password_reset',
      data: { name: user.fullName, otp },
    });

    return res.json({ message: 'Password reset OTP has been sent to your email.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send password reset code. Please try again.' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req: Request, res: Response): Promise<any> => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP code are required.' });

  const record = await db.otpRecords.findOne((r: any) => r.email === email.trim().toLowerCase() && r.otp === otp.trim());
  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This OTP has expired. Please request a new one.' });
  }

  await db.otpRecords.updateOne({ id: record.id }, { verified: true });
  return res.json({ verified: true, message: 'OTP verified successfully.' });
});

// Reset Password with Verified OTP
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const record = await db.otpRecords.findOne(
      (r: any) => r.email === email.trim().toLowerCase() && r.otp === otp.trim() && r.verified === true
    );
    if (!record) {
      return res.status(400).json({ error: 'OTP is either unverified or expired. Please re-verify.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.users.updateOne({ email: email.trim().toLowerCase() }, { passwordHash });
    await db.otpRecords.deleteOne({ id: record.id });

    return res.json({ message: 'Your password has been successfully reset. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const { passwordHash, ...safeUser } = req.user as any;
  res.json({ user: safeUser });
});

// Update Profile
app.put('/api/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const { fullName, username, country, countryCode, bio, avatarUrl } = req.body;

    const updates: Partial<User> = {};
    if (fullName) updates.fullName = fullName.trim();
    if (country) updates.country = country;
    if (countryCode) updates.countryCode = countryCode;
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await db.users.findOne({ username: cleanUsername });
      if (existing && existing.uid !== user.uid) {
        return res.status(409).json({ error: 'That username is already taken.' });
      }
      updates.username = cleanUsername;
    }

    updates.updatedAt = new Date().toISOString();

    await db.users.updateOne({ uid: user.uid }, updates);
    const updatedUser = await db.users.findOne({ uid: user.uid });
    const { passwordHash, ...safe } = updatedUser;

    return res.json({ user: safe, message: 'Profile updated successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ----------------------------------------------------
// 3. AI TUTOR (SSE Streaming, Image Analysis, Memory)
// ----------------------------------------------------

// Get Auto Greeting
app.get('/api/tutor/greeting', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const greeting = await generateTutorGreeting({
    studentUid: user.uid,
    studentName: user.fullName,
    level: user.level,
    xp: user.xp,
    country: user.country,
  });
  res.json({ greeting, aiTutorName: REMLY_CONFIG.aiTutorName });
});

// Tutor Chat SSE Streaming Route
app.post('/api/tutor/chat/stream', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const user = req.user!;
  const { message, conversationId, imageBase64, imageMimeType } = req.body;

  if (!message && !imageBase64) {
    return res.status(400).json({ error: 'A message or image is required.' });
  }

  const convId = conversationId || `conv_${user.uid}_${Date.now()}`;

  // Save student message
  await db.messages.insertOne({
    id: `msg_${Date.now()}_u`,
    conversationId: convId,
    studentUid: user.uid,
    sender: 'student',
    text: message || '[Image Uploaded]',
    imageUrl: imageBase64 ? `data:${imageMimeType || 'image/png'};base64,${imageBase64}` : undefined,
    timestamp: new Date().toISOString(),
  });

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  await streamTutorChat({
    context: {
      studentUid: user.uid,
      studentName: user.fullName,
      level: user.level,
      xp: user.xp,
      country: user.country,
    },
    conversationId: convId,
    userMessage: message || '',
    imageBase64,
    imageMimeType,
    onChunk: (chunk: string) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    },
    onComplete: async (fullText: string, actionPayload?: any) => {
      // Save tutor message
      await db.messages.insertOne({
        id: `msg_${Date.now()}_t`,
        conversationId: convId,
        studentUid: user.uid,
        sender: 'tutor',
        text: fullText,
        timestamp: new Date().toISOString(),
      });

      // Handle automatic scheduling action if triggered by AI
      if (actionPayload && actionPayload.type === 'schedule_class') {
        try {
          const scheduled = await scheduleClass(user.uid, actionPayload.data);
          res.write(`data: ${JSON.stringify({ action: 'class_scheduled', class: scheduled })}\n\n`);
        } catch (e) {
          console.warn('Class auto-schedule error:', e);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, fullText, conversationId: convId })}\n\n`);
      res.end();
    },
    onError: (err: any) => {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream generation failed' })}\n\n`);
      res.end();
    },
  });
});

// Fetch Preserved Conversation History for Student
app.get('/api/tutor/messages', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const messages = await db.messages.find(
      (m: any) => m.studentUid === user.uid || (m.conversationId && m.conversationId.includes(user.uid))
    );
    messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return res.json({ messages });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve conversation history.' });
  }
});

// Reset / Clear Conversation History for Student
app.delete('/api/tutor/messages', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    await db.messages.deleteMany(
      (m: any) => m.studentUid === user.uid || (m.conversationId && m.conversationId.includes(user.uid))
    );
    return res.json({ message: 'Conversation history reset successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear conversation history.' });
  }
});

// Synthesize Speech with ElevenLabs
app.post('/api/tutor/voice', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { text, gender = 'female' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required for voice synthesis.' });

  const result = await synthesizeTutorSpeech(text, gender);
  return res.json(result);
});

// Tutor Memory
app.get('/api/tutor/memory', requireAuth, async (req: AuthRequest, res: Response) => {
  const memories = await fetchRelevantMemories(req.user!.uid);
  res.json({ memories });
});

// ----------------------------------------------------
// ASSIGNMENT SOLVER (Vision AI + Full Step Derivations)
// ----------------------------------------------------
app.post('/api/assignment/solve', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const { imageBase64, imageMimeType, subject, instructions } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'An image of the assignment is required.' });
    }

    const solution = await solveAssignmentFromImage({
      imageBase64,
      imageMimeType: imageMimeType || 'image/png',
      subject,
      instructions,
      studentUid: user.uid,
    });

    // Save with image preview for student archive
    const savedRecord = {
      ...solution,
      imageUrl: `data:${imageMimeType || 'image/png'};base64,${imageBase64}`,
      createdAt: new Date().toISOString(),
    };
    await db.assignmentSolutions.insertOne(savedRecord);

    // Reward student with XP for practicing assignments
    await awardStudentXP(user.uid, 25, `Solved assignment problem: ${solution.title}`);

    return res.json({ solution: savedRecord, message: 'Assignment solved successfully!' });
  } catch (err: any) {
    console.error('Assignment solver error:', err);
    return res.status(500).json({ error: err.message || 'Failed to solve assignment.' });
  }
});

app.get('/api/assignment/history', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const history = await db.assignmentSolutions.find({ studentUid: user.uid });
    history.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve assignment history.' });
  }
});

app.delete('/api/assignment/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    await db.assignmentSolutions.deleteOne({ id, studentUid: user.uid });
    return res.json({ message: 'Assignment record deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete assignment.' });
  }
});

// ----------------------------------------------------
// 4. CLASSES & SCHEDULING
// ----------------------------------------------------
app.get('/api/classes', requireAuth, async (req: AuthRequest, res: Response) => {
  const classes = await getStudentClasses(req.user!.uid);
  res.json({ classes });
});

app.post('/api/classes', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { subject, topic, days, time, durationMinutes, learningGoal } = req.body;
    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }
    const newClass = await scheduleClass(req.user!.uid, {
      subject,
      topic,
      days,
      time,
      durationMinutes,
      learningGoal,
    });
    return res.status(201).json({ class: newClass, message: 'Class scheduled successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to schedule class.' });
  }
});

app.delete('/api/classes/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const ok = await cancelClass(req.params.id, req.user!.uid);
  return res.json({ success: ok });
});

// ----------------------------------------------------
// 5. EXAMS & ACADEMIC COMPLIANCE
// ----------------------------------------------------
app.get('/api/exams', requireAuth, async (req: AuthRequest, res: Response) => {
  const exams = await getAllExams();
  const attempts = await getStudentExamAttempts(req.user!.uid);
  res.json({ exams, attempts });
});

app.get('/api/exams/:id', requireAuth, async (req: Request, res: Response): Promise<any> => {
  const exam = await getExamById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  // Omit correct answers from the student payload during examination
  const safeQuestions = exam.questions.map(({ correctAnswer, ...rest }) => rest);
  res.json({ exam: { ...exam, questions: safeQuestions } });
});

app.post('/api/exams/:id/start', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const attempt = await startExamAttempt(req.params.id, req.user!.uid);
    res.json({ attempt });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/api/exams/event', requireAuth, async (req: AuthRequest, res: Response) => {
  const { attemptId, eventType, details } = req.body;
  const ok = await recordExamEvent(attemptId, req.user!.uid, eventType, details);
  res.json({ success: ok });
});

app.post('/api/exams/:id/submit', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { attemptId, answers } = req.body;
    const result = await submitExamAttempt(attemptId, req.user!.uid, answers || {});
    // Get updated user state with XP
    const updatedUser = await db.users.findOne({ uid: req.user!.uid });
    res.json({ result, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit exam.' });
  }
});

app.post('/api/exams/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required.' });
  const generatedExam = await generateExamForTopic(topic, req.user!.uid);
  await db.exams.insertOne(generatedExam);
  res.status(201).json({ exam: generatedExam, message: `Exam on "${topic}" successfully created!` });
});

// ----------------------------------------------------
// 6. CREATOR STUDIO & AI IMAGE GENERATOR
// ----------------------------------------------------
app.post('/api/creator/image/generate', requireAuth, requireRole(['creator', 'admin']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { prompt, style, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

    const item = await generateCreatorImage({
      creatorUid: req.user!.uid,
      prompt,
      style,
      aspectRatio,
    });
    return res.status(201).json({ image: item });
  } catch (err: any) {
    console.error('Creator image generation failed', err);
    return res.status(500).json({ error: 'Unable to generate the image right now. Please try again.' });
  }
});

app.get('/api/creator/generations', requireAuth, requireRole(['creator', 'admin']), async (req: AuthRequest, res: Response) => {
  const history = await getCreatorHistory(req.user!.uid);
  res.json({ history });
});

app.delete('/api/creator/generations/:id', requireAuth, requireRole(['creator', 'admin']), async (req: AuthRequest, res: Response) => {
  const ok = await deleteCreatorImage(req.params.id, req.user!.uid);
  res.json({ success: ok });
});

// ----------------------------------------------------
// 7. NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
  const list = await db.notifications.find({ userUid: req.user!.uid });
  res.json({ notifications: list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
});

app.put('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  await db.notifications.updateOne({ id: req.params.id, userUid: req.user!.uid }, { read: true });
  res.json({ success: true });
});

// ----------------------------------------------------
// 8. ADMIN DASHBOARD
// ----------------------------------------------------
app.get('/api/admin/stats', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  const stats = await getAdminPlatformStats();
  res.json({ stats });
});

app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  const query = (req.query.search as string) || '';
  const users = await searchUsers(query);
  res.json({ users });
});

app.post('/api/admin/users/:uid/suspend', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { reason, duration } = req.body;
    await suspendUserAccount(req.user!.uid, req.params.uid, reason || 'Compliance review', duration || '7 days');
    res.json({ success: true, message: 'User suspended successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/users/:uid/restore', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await restoreUserAccount(req.user!.uid, req.params.uid);
    res.json({ success: true, message: 'User account restored successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. COMMUNITY & GLOBAL GROUP CHAT
// ----------------------------------------------------
app.get('/api/communities', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const data = await getUserCommunities(req.user!);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch communities.' });
  }
});

app.post('/api/communities', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { name, description, isPublic, rules, tags } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Community name is required.' });
    }
    const community = await createCommunity(req.user!, {
      name,
      description: description || '',
      isPublic: !!isPublic,
      rules: rules || [],
      tags: tags || [],
    });
    return res.status(201).json({ community, message: 'Community created successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create community.' });
  }
});

app.put('/api/communities/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const community = await updateCommunitySettings(req.params.id, req.user!, req.body);
    return res.json({ community, message: 'Settings updated.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/communities/:id/members', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Target user UID is required.' });
    const result = await addMemberByUid(req.params.id, req.user!, uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.delete('/api/communities/:id/members/:uid', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await removeMember(req.params.id, req.user!, req.params.uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/communities/:id/join-request', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await requestToJoinCommunity(req.params.id, req.user!);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/communities/:id/join-requests/:uid/review', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { action } = req.body;
    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approved" or "rejected".' });
    }
    const result = await reviewJoinRequest(req.params.id, req.user!, req.params.uid, action);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/communities/:id/messages', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const messages = await getCommunityMessages(req.params.id, req.user!);
    return res.json({ messages });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

app.post('/api/communities/:id/messages', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { content, type, mediaUrl, audioDuration, stickerId, replyTo } = req.body;
    if (!content && !mediaUrl && !stickerId) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    const result = await sendCommunityMessage(req.params.id, req.user!, {
      content: content || '',
      type,
      mediaUrl,
      audioDuration,
      stickerId,
      replyTo,
    });
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/communities/:id/messages/:msgId/react', requireAuth, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'Emoji is required.' });
    const result = await toggleMessageReaction(req.params.msgId, emoji, req.user!);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. START SERVER & VITE MIDDLEWARE
// ----------------------------------------------------
async function start() {
  await db.connect();
  await ensureDefaultCommunities();
  startClassReminderScheduler();

  // Seed default admin account if not existing
  const adminExists = await db.users.findOne({ role: 'admin' });
  if (!adminExists) {
    const adminPasswordHash = await hashPassword('Admin@Remly2026!');
    const adminUser: User = {
      id: 'usr_admin_default',
      uid: 'RML-ADMIN01',
      email: 'admin@remly.edu',
      username: 'admin',
      fullName: 'Remly Administrator',
      role: 'admin',
      isEmailVerified: true,
      isSuspended: false,
      missedExamsCount: 0,
      academicRestricted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      level: 10,
      xp: 10000,
      learningStreak: 100,
    };
    await db.users.insertOne({ ...adminUser, passwordHash: adminPasswordHash });
    console.log('🛡️ [Seed] Default administrator account provisioned: admin@remly.edu / Admin@Remly2026!');
  }

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Remly] Production server listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Remly] Fatal server boot error:', err);
});
