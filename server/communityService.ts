import { db } from './db';
import { Community, CommunityMessage, User } from '../src/types';
import { GoogleGenAI } from '@google/genai';
import { stripMarkdownSymbols } from './aiService';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || 'missing-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Ensure official global community is seeded
export async function ensureDefaultCommunities(): Promise<void> {
  const existing = await db.communities.findOne({ id: 'remly-global' });
  if (!existing) {
    const defaultCommunity: Community = {
      id: 'remly-global',
      name: 'Remly Global Community',
      description:
        'The worldwide learning & creation hub for all Remly students, creators, and mentors. Managed by Remly Admin with 24/7 Remly AI assistance.',
      isOfficial: true,
      createdBy: 'RML-ADMIN-01',
      creatorName: 'Remly Admin',
      admins: ['RML-ADMIN-01'],
      members: [],
      isPublic: true,
      joinRequests: [],
      rules: [
        'Be respectful, supportive, and kind to fellow global learners and creators.',
        'Tag @remly or @ai whenever you need instant homework help, conceptual explanations, or advice.',
        'No spam, promotions, or academic dishonesty. Share knowledge and celebrate progress!',
        'Use voice notes and images to share questions or show visual workings clearly.',
      ],
      tags: ['#GlobalHub', '#RemlyAI', '#Official', '#StudyTogether'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    };

    await db.communities.insertOne(defaultCommunity);

    // Add initial welcome messages
    const welcomeAdmin: CommunityMessage = {
      id: 'msg-init-1',
      communityId: 'remly-global',
      senderId: 'RML-ADMIN-01',
      senderName: 'Remly Admin',
      senderRole: 'admin',
      content:
        'Welcome to the Remly Global Community! 🌍 This is our collaborative space for students and creators worldwide. Feel free to share study notes, ask questions, send voice notes, and learn together.',
      type: 'text',
      reactions: { '👋': ['RML-ADMIN-01'], '🚀': ['RML-ADMIN-01'] },
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };

    const welcomeAi: CommunityMessage = {
      id: 'msg-init-2',
      communityId: 'remly-global',
      senderId: 'remly-ai',
      senderName: 'Remly AI ⚡',
      senderRole: 'ai',
      content:
        'Hello everyone! I am Remly AI. Tag me with @remly anytime you need help with math, physics, coding, essay structuring, or study tips in the group chat. Have fun learning!',
      type: 'text',
      reactions: { '💡': ['RML-ADMIN-01'], '❤️': ['RML-ADMIN-01'] },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    };

    await db.communityMessages.insertOne(welcomeAdmin);
    await db.communityMessages.insertOne(welcomeAi);
  }
}

// Get communities accessible by user
export async function getUserCommunities(user: User): Promise<{
  joined: Community[];
  publicCommunities: (Community & { hasRequestedJoin: boolean })[];
}> {
  await ensureDefaultCommunities();
  const all = (await db.communities.find()) as Community[];

  const joined: Community[] = [];
  const publicCommunities: (Community & { hasRequestedJoin: boolean })[] = [];

  for (const c of all) {
    const isMemberOrAdmin =
      c.isOfficial ||
      c.createdBy === user.uid ||
      c.admins?.includes(user.uid) ||
      c.members?.includes(user.uid);

    if (isMemberOrAdmin) {
      joined.push(c);
    } else if (c.isPublic) {
      const hasRequested = c.joinRequests?.some(
        (r) => r.uid === user.uid && r.status === 'pending'
      );
      publicCommunities.push({
        ...c,
        hasRequestedJoin: !!hasRequested,
      });
    }
  }

  return { joined, publicCommunities };
}

// Create a new community
export async function createCommunity(
  user: User,
  payload: {
    name: string;
    description: string;
    isPublic: boolean;
    rules?: string[];
    tags?: string[];
  }
): Promise<Community> {
  const commId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newComm: Community = {
    id: commId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    isOfficial: false,
    createdBy: user.uid,
    creatorName: user.fullName || user.username,
    admins: [user.uid],
    members: [user.uid],
    isPublic: !!payload.isPublic,
    joinRequests: [],
    rules:
      payload.rules && payload.rules.length > 0
        ? payload.rules
        : ['Be respectful and support all members.', 'Collaborate productively and share knowledge.'],
    tags: payload.tags || ['#StudyGroup'],
    createdAt: new Date().toISOString(),
  };

  await db.communities.insertOne(newComm);

  // System welcome message
  const sysMsg: CommunityMessage = {
    id: `msg-${Date.now()}`,
    communityId: commId,
    senderId: 'system',
    senderName: 'System',
    senderRole: 'admin',
    content: `${user.fullName} created "${newComm.name}". Welcome everyone!`,
    type: 'system',
    reactions: {},
    createdAt: new Date().toISOString(),
  };
  await db.communityMessages.insertOne(sysMsg);

  return newComm;
}

// Add member by UID (Admin only)
export async function addMemberByUid(
  communityId: string,
  caller: User,
  targetUid: string
): Promise<{ success: boolean; member: { uid: string; fullName: string }; message: string }> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const isAdmin =
    comm.admins.includes(caller.uid) ||
    comm.createdBy === caller.uid ||
    caller.role === 'admin';
  if (!isAdmin) {
    throw new Error('Only community admins can add members.');
  }

  const cleanUid = targetUid.trim().toUpperCase();
  const targetUser = (await db.users.findOne({ uid: cleanUid })) as User | null;
  if (!targetUser) {
    throw new Error(`User with Remly UID "${cleanUid}" was not found.`);
  }

  if (comm.members.includes(cleanUid)) {
    throw new Error(`${targetUser.fullName} (${cleanUid}) is already a member.`);
  }

  const updatedMembers = [...comm.members, cleanUid];
  // If user had a pending join request, mark as approved
  const updatedRequests = (comm.joinRequests || []).map((r) =>
    r.uid === cleanUid ? { ...r, status: 'approved' as const } : r
  );

  await db.communities.updateOne(
    { id: communityId },
    {
      members: updatedMembers,
      joinRequests: updatedRequests,
    }
  );

  // Add system message
  const sysMsg: CommunityMessage = {
    id: `msg-${Date.now()}`,
    communityId,
    senderId: 'system',
    senderName: 'System',
    senderRole: 'admin',
    content: `${caller.fullName} added ${targetUser.fullName} (${cleanUid}) to the community.`,
    type: 'system',
    reactions: {},
    createdAt: new Date().toISOString(),
  };
  await db.communityMessages.insertOne(sysMsg);

  return {
    success: true,
    member: { uid: targetUser.uid, fullName: targetUser.fullName },
    message: `Added ${targetUser.fullName} to ${comm.name}!`,
  };
}

// Remove member (Admin only)
export async function removeMember(
  communityId: string,
  caller: User,
  targetUid: string
): Promise<{ success: boolean; message: string }> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const isAdmin =
    comm.admins.includes(caller.uid) ||
    comm.createdBy === caller.uid ||
    caller.role === 'admin';
  if (!isAdmin) {
    throw new Error('Only community admins can remove members.');
  }

  if (targetUid === comm.createdBy && caller.role !== 'admin') {
    throw new Error('The community creator cannot be removed.');
  }

  const updatedMembers = comm.members.filter((m) => m !== targetUid);
  const updatedAdmins = comm.admins.filter((a) => a !== targetUid);

  await db.communities.updateOne(
    { id: communityId },
    {
      members: updatedMembers,
      admins: updatedAdmins,
    }
  );

  const targetUser = (await db.users.findOne({ uid: targetUid })) as User | null;
  const targetName = targetUser ? targetUser.fullName : targetUid;

  const sysMsg: CommunityMessage = {
    id: `msg-${Date.now()}`,
    communityId,
    senderId: 'system',
    senderName: 'System',
    senderRole: 'admin',
    content: `${caller.fullName} removed ${targetName} from the community.`,
    type: 'system',
    reactions: {},
    createdAt: new Date().toISOString(),
  };
  await db.communityMessages.insertOne(sysMsg);

  return { success: true, message: `Removed ${targetName} from community.` };
}

// Request to join a public community
export async function requestToJoinCommunity(
  communityId: string,
  user: User
): Promise<{ success: boolean; message: string }> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  if (!comm.isPublic && !comm.isOfficial) {
    throw new Error('This community is private. You must be added by UID.');
  }

  if (comm.members.includes(user.uid) || comm.isOfficial) {
    return { success: true, message: 'You are already a member of this community.' };
  }

  const requests = comm.joinRequests || [];
  const existingReq = requests.find((r) => r.uid === user.uid && r.status === 'pending');
  if (existingReq) {
    return { success: true, message: 'Your join request is already pending review.' };
  }

  const newReq = {
    uid: user.uid,
    fullName: user.fullName || user.username,
    username: user.username,
    role: user.role,
    requestedAt: new Date().toISOString(),
    status: 'pending' as const,
  };

  await db.communities.updateOne(
    { id: communityId },
    {
      joinRequests: [...requests, newReq],
    }
  );

  return { success: true, message: 'Join request sent to community admins!' };
}

// Review a join request (Admin only)
export async function reviewJoinRequest(
  communityId: string,
  caller: User,
  targetUid: string,
  action: 'approved' | 'rejected'
): Promise<{ success: boolean; message: string }> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const isAdmin =
    comm.admins.includes(caller.uid) ||
    comm.createdBy === caller.uid ||
    caller.role === 'admin';
  if (!isAdmin) {
    throw new Error('Only community admins can review join requests.');
  }

  const requests = (comm.joinRequests || []).map((r) =>
    r.uid === targetUid ? { ...r, status: action } : r
  );

  let updatedMembers = comm.members;
  if (action === 'approved' && !comm.members.includes(targetUid)) {
    updatedMembers = [...comm.members, targetUid];

    const targetUser = (await db.users.findOne({ uid: targetUid })) as User | null;
    const targetName = targetUser ? targetUser.fullName : targetUid;

    const sysMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      communityId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'admin',
      content: `${targetName} was approved and joined the community! 🎉`,
      type: 'system',
      reactions: {},
      createdAt: new Date().toISOString(),
    };
    await db.communityMessages.insertOne(sysMsg);
  }

  await db.communities.updateOne(
    { id: communityId },
    {
      joinRequests: requests,
      members: updatedMembers,
    }
  );

  return {
    success: true,
    message: `Request has been ${action}.`,
  };
}

// Update community settings
export async function updateCommunitySettings(
  communityId: string,
  caller: User,
  payload: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    rules?: string[];
    tags?: string[];
  }
): Promise<Community> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const isAdmin =
    comm.admins.includes(caller.uid) ||
    comm.createdBy === caller.uid ||
    caller.role === 'admin';
  if (!isAdmin) {
    throw new Error('Only community admins can update settings.');
  }

  const updates: Partial<Community> = {};
  if (payload.name) updates.name = payload.name.trim();
  if (payload.description) updates.description = payload.description.trim();
  if (typeof payload.isPublic === 'boolean') updates.isPublic = payload.isPublic;
  if (payload.rules) updates.rules = payload.rules;
  if (payload.tags) updates.tags = payload.tags;
  updates.updatedAt = new Date().toISOString();

  await db.communities.updateOne({ id: communityId }, updates);
  const updated = (await db.communities.findOne({ id: communityId })) as Community;
  return updated;
}

// Get Community Messages
export async function getCommunityMessages(
  communityId: string,
  user: User
): Promise<CommunityMessage[]> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const hasAccess =
    comm.isOfficial ||
    comm.members.includes(user.uid) ||
    comm.admins.includes(user.uid) ||
    user.role === 'admin';

  if (!hasAccess) {
    throw new Error('You do not have access to this community.');
  }

  const msgs = (await db.communityMessages.find({ communityId })) as CommunityMessage[];
  return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Send Community Message & Trigger Remly AI if tagged
export async function sendCommunityMessage(
  communityId: string,
  user: User,
  payload: {
    content: string;
    type?: 'text' | 'image' | 'voice' | 'sticker';
    mediaUrl?: string;
    audioDuration?: number;
    stickerId?: string;
    replyTo?: { id: string; senderName: string; content: string };
  }
): Promise<{ userMessage: CommunityMessage; aiMessage?: CommunityMessage }> {
  const comm = (await db.communities.findOne({ id: communityId })) as Community | null;
  if (!comm) throw new Error('Community not found');

  const hasAccess =
    comm.isOfficial ||
    comm.members.includes(user.uid) ||
    comm.admins.includes(user.uid) ||
    user.role === 'admin';

  if (!hasAccess) {
    throw new Error('You must be a member to send messages in this community.');
  }

  const messageType = payload.type || (payload.mediaUrl ? (payload.audioDuration ? 'voice' : 'image') : 'text');

  // Detect mentions e.g. @remly, @username
  const mentionMatches = payload.content.match(/@([a-zA-Z0-9_-]+)/g) || [];
  const mentions = Array.from(new Set(mentionMatches.map((m) => m.toLowerCase())));

  const userMessage: CommunityMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    communityId,
    senderId: user.uid,
    senderName: user.fullName || user.username,
    senderRole: user.role,
    senderAvatar: user.avatarUrl,
    content: payload.content,
    type: messageType,
    mediaUrl: payload.mediaUrl,
    audioDuration: payload.audioDuration,
    stickerId: payload.stickerId,
    reactions: {},
    mentions,
    createdAt: new Date().toISOString(),
    replyTo: payload.replyTo,
  };

  await db.communityMessages.insertOne(userMessage);

  // Check if Remly AI should respond in the group chat!
  const triggersAi =
    mentions.includes('@remly') ||
    mentions.includes('@ai') ||
    payload.content.toLowerCase().includes('@remly') ||
    (comm.isOfficial && payload.content.toLowerCase().startsWith('remly,'));

  let aiMessage: CommunityMessage | undefined;

  if (triggersAi) {
    try {
      const cleanPrompt = payload.content
        .replace(/@remly/gi, '')
        .replace(/@ai/gi, '')
        .trim();

      const aiText = await generateCommunityAiReply(
        cleanPrompt || 'Hello Remly AI, help us out in this group chat!',
        user.fullName || user.username,
        comm.name
      );

      aiMessage = {
        id: `msg-${Date.now() + 10}-${Math.random().toString(36).substring(2, 6)}`,
        communityId,
        senderId: 'remly-ai',
        senderName: 'Remly AI ⚡',
        senderRole: 'ai',
        content: aiText,
        type: 'text',
        reactions: { '💡': [user.uid] },
        mentions: [`@${(user.username || user.fullName || 'student').toLowerCase()}`],
        createdAt: new Date(Date.now() + 500).toISOString(),
        replyTo: {
          id: userMessage.id,
          senderName: userMessage.senderName,
          content: userMessage.content,
        },
      };

      await db.communityMessages.insertOne(aiMessage);
    } catch (err) {
      console.warn('Community Remly AI reply failed:', err);
    }
  }

  return { userMessage, aiMessage };
}

// Toggle reaction
export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  user: User
): Promise<{ reactions: Record<string, string[]> }> {
  const msg = (await db.communityMessages.findOne({ id: messageId })) as CommunityMessage | null;
  if (!msg) throw new Error('Message not found');

  const reactions = { ...(msg.reactions || {}) };
  const currentReactors = reactions[emoji] || [];

  if (currentReactors.includes(user.uid)) {
    // Remove reaction
    reactions[emoji] = currentReactors.filter((u) => u !== user.uid);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  } else {
    // Add reaction
    reactions[emoji] = [...currentReactors, user.uid];
  }

  await db.communityMessages.updateOne({ id: messageId }, { reactions });
  return { reactions };
}

// Generate Group Chat AI response
async function generateCommunityAiReply(
  prompt: string,
  senderName: string,
  communityName: string
): Promise<string> {
  const ai = getGeminiClient();

  const systemInstruction = `You are Remly AI, the official intelligent assistant inside the "${communityName}" group chat.
A member named "${senderName}" tagged you with a question or comment.
Guidelines:
1. Speak in a helpful, collaborative, friendly, and motivating tone suitable for a lively community group chat.
2. Provide direct, accurate explanations or answers to their questions.
3. Keep it crisp, readable, and conversational (around 2-4 concise paragraphs or bullet points).
4. Do NOT use markdown symbols like asterisks (**bold**), hashes (###), backticks, or messy delimiters. Use plain, elegant text with clean bullet points (•) if listing steps.
5. End with an encouraging closing or a thought-provoking follow-up question.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const raw = response.text || "I'm here to help! Let me know what specific concept or homework problem you would like broken down.";
    return stripMarkdownSymbols(raw);
  } catch (err) {
    console.warn('Gemini community response error:', err);
    return `Hey ${senderName}! Remly AI is here. That is a great topic to bring up in the group. Let me know if you would like step-by-step guidance on any specific problem!`;
  }
}
