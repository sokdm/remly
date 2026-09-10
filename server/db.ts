import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Collection as MongoCollection } from 'mongodb';

export interface StorageCollection<T extends { id?: string; _id?: any }> {
  find(query?: Partial<T> | ((item: T) => boolean)): Promise<T[]>;
  findOne(query: Partial<T> | ((item: T) => boolean)): Promise<T | null>;
  insertOne(doc: T): Promise<T>;
  insertMany(docs: T[]): Promise<T[]>;
  updateOne(filter: Partial<T> | ((item: T) => boolean), update: Partial<T> | { $set?: Partial<T>; $inc?: Record<string, number> }): Promise<boolean>;
  deleteOne(filter: Partial<T> | ((item: T) => boolean)): Promise<boolean>;
  deleteMany(filter: Partial<T> | ((item: T) => boolean)): Promise<number>;
  countDocuments(query?: Partial<T> | ((item: T) => boolean)): Promise<number>;
}

class LocalJsonCollection<T extends { id?: string; _id?: any }> implements StorageCollection<T> {
  private collectionName: string;
  private filePath: string;
  private data: T[] = [];

  constructor(collectionName: string, dataDir: string) {
    this.collectionName = collectionName;
    this.filePath = path.join(dataDir, `${collectionName}.json`);
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = [];
        this.save();
      }
    } catch (e) {
      console.warn(`[LocalStore] Failed to load ${this.collectionName}, starting fresh.`, e);
      this.data = [];
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[LocalStore] Failed to save ${this.collectionName}`, e);
    }
  }

  private matchQuery(item: T, query?: Partial<T> | ((item: T) => boolean)): boolean {
    if (!query) return true;
    if (typeof query === 'function') return query(item);
    for (const key of Object.keys(query)) {
      const qVal = (query as any)[key];
      const iVal = (item as any)[key];
      if (qVal !== undefined && iVal !== qVal) {
        return false;
      }
    }
    return true;
  }

  async find(query?: Partial<T> | ((item: T) => boolean)): Promise<T[]> {
    return this.data.filter((item) => this.matchQuery(item, query));
  }

  async findOne(query: Partial<T> | ((item: T) => boolean)): Promise<T | null> {
    const found = this.data.find((item) => this.matchQuery(item, query));
    return found ? { ...found } : null;
  }

  async insertOne(doc: T): Promise<T> {
    if (!doc.id && !(doc as any)._id) {
      (doc as any).id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    this.data.push({ ...doc });
    this.save();
    return doc;
  }

  async insertMany(docs: T[]): Promise<T[]> {
    for (const doc of docs) {
      if (!doc.id && !(doc as any)._id) {
        (doc as any).id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      this.data.push({ ...doc });
    }
    this.save();
    return docs;
  }

  async updateOne(
    filter: Partial<T> | ((item: T) => boolean),
    update: Partial<T> | { $set?: Partial<T>; $inc?: Record<string, number> }
  ): Promise<boolean> {
    const index = this.data.findIndex((item) => this.matchQuery(item, filter));
    if (index === -1) return false;

    const current = this.data[index] as any;
    let next = { ...current };

    if ((update as any).$set || (update as any).$inc) {
      if ((update as any).$set) {
        Object.assign(next, (update as any).$set);
      }
      if ((update as any).$inc) {
        for (const [k, v] of Object.entries((update as any).$inc)) {
          next[k] = (next[k] || 0) + Number(v);
        }
      }
    } else {
      Object.assign(next, update);
    }

    this.data[index] = next;
    this.save();
    return true;
  }

  async deleteOne(filter: Partial<T> | ((item: T) => boolean)): Promise<boolean> {
    const index = this.data.findIndex((item) => this.matchQuery(item, filter));
    if (index === -1) return false;
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  async deleteMany(filter: Partial<T> | ((item: T) => boolean)): Promise<number> {
    const initial = this.data.length;
    this.data = this.data.filter((item) => !this.matchQuery(item, filter));
    const deleted = initial - this.data.length;
    if (deleted > 0) {
      this.save();
    }
    return deleted;
  }

  async countDocuments(query?: Partial<T> | ((item: T) => boolean)): Promise<number> {
    return this.find(query).then((items) => items.length);
  }
}

class MongoAtlasCollection<T extends { id?: string; _id?: any }> implements StorageCollection<T> {
  private col: MongoCollection<any>;

  constructor(col: MongoCollection<any>) {
    this.col = col;
  }

  async find(query: any = {}): Promise<T[]> {
    const docs = await this.col.find(typeof query === 'function' ? {} : query).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { id: d.id || _id.toString(), ...rest } as T;
    });
  }

  async findOne(query: any): Promise<T | null> {
    const doc = await this.col.findOne(typeof query === 'function' ? {} : query);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: doc.id || _id.toString(), ...rest } as T;
  }

  async insertOne(doc: T): Promise<T> {
    const insertDoc: any = { ...doc };
    if (!insertDoc.id) {
      insertDoc.id = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    await this.col.insertOne(insertDoc);
    return insertDoc;
  }

  async insertMany(docs: T[]): Promise<T[]> {
    const insertDocs = docs.map((d: any) => ({
      ...d,
      id: d.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }));
    if (insertDocs.length > 0) {
      await this.col.insertMany(insertDocs);
    }
    return insertDocs;
  }

  async updateOne(filter: any, update: any): Promise<boolean> {
    const updatePayload = update.$set || update.$inc ? update : { $set: update };
    const res = await this.col.updateOne(filter, updatePayload);
    return res.matchedCount > 0;
  }

  async deleteOne(filter: any): Promise<boolean> {
    const res = await this.col.deleteOne(filter);
    return res.deletedCount > 0;
  }

  async deleteMany(filter: any): Promise<number> {
    const res = await this.col.deleteMany(filter);
    return res.deletedCount;
  }

  async countDocuments(query: any = {}): Promise<number> {
    return this.col.countDocuments(query);
  }
}

export class RemlyDatabase {
  private static instance: RemlyDatabase;
  private client: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isConnectedToAtlas: boolean = false;
  private dataDir: string = path.join(process.cwd(), 'data');

  public users!: StorageCollection<any>;
  public profiles!: StorageCollection<any>;
  public sessions!: StorageCollection<any>;
  public conversations!: StorageCollection<any>;
  public messages!: StorageCollection<any>;
  public memories!: StorageCollection<any>;
  public classes!: StorageCollection<any>;
  public schedules!: StorageCollection<any>;
  public notifications!: StorageCollection<any>;
  public exams!: StorageCollection<any>;
  public examAttempts!: StorageCollection<any>;
  public xpRecords!: StorageCollection<any>;
  public creatorGenerations!: StorageCollection<any>;
  public passwordResets!: StorageCollection<any>;
  public otpRecords!: StorageCollection<any>;
  public emailEvents!: StorageCollection<any>;
  public adminActions!: StorageCollection<any>;
  public assignmentSolutions!: StorageCollection<any>;
  public communities!: StorageCollection<any>;
  public communityMessages!: StorageCollection<any>;

  private constructor() {
    this.initCollections(false);
  }

  public static getInstance(): RemlyDatabase {
    if (!RemlyDatabase.instance) {
      RemlyDatabase.instance = new RemlyDatabase();
    }
    return RemlyDatabase.instance;
  }

  private initCollections(isMongo: boolean) {
    const names = [
      'users',
      'profiles',
      'sessions',
      'conversations',
      'messages',
      'memories',
      'classes',
      'schedules',
      'notifications',
      'exams',
      'examAttempts',
      'xpRecords',
      'creatorGenerations',
      'passwordResets',
      'otpRecords',
      'emailEvents',
      'adminActions',
      'assignmentSolutions',
      'communities',
      'communityMessages',
    ];

    for (const name of names) {
      if (isMongo && this.mongoDb) {
        (this as any)[name] = new MongoAtlasCollection(this.mongoDb.collection(name));
      } else {
        (this as any)[name] = new LocalJsonCollection(name, this.dataDir);
      }
    }
  }

  public async connect(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes('<username>') || uri.includes('MY_MONGODB_URI')) {
      console.log('ℹ️ [Database] MongoDB Atlas URI not configured or using placeholder. Running on resilient local JSON engine.');
      this.initCollections(false);
      await this.seedInitialData();
      return;
    }

    try {
      console.log('⏳ [Database] Connecting to MongoDB Atlas...');
      this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await this.client.connect();
      this.mongoDb = this.client.db('remly');
      this.isConnectedToAtlas = true;
      this.initCollections(true);
      console.log('✅ [Database] Successfully connected to MongoDB Atlas cluster!');
      await this.seedInitialData();
    } catch (err: any) {
      console.warn('⚠️ [Database] MongoDB Atlas connection failed. Falling back to local storage engine:', err.message);
      this.isConnectedToAtlas = false;
      this.initCollections(false);
      await this.seedInitialData();
    }
  }

  public isAtlas(): boolean {
    return this.isConnectedToAtlas;
  }

  private async seedInitialData() {
    // Seed standard exams if empty
    const examCount = await this.exams.countDocuments();
    if (examCount === 0) {
      const defaultExams = [
        {
          id: 'exam_physics_101',
          title: "Newton's Laws & Classical Mechanics",
          course: 'Physics 101',
          subject: 'Physics',
          description: 'Assess understanding of inertia, F=ma, action-reaction pairs, and projectile kinematics.',
          durationMinutes: 20,
          passingScore: 70,
          totalPoints: 100,
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: "Which of Newton's laws states that an object remains at rest or in uniform motion unless acted upon by a net external force?",
              options: ["First Law (Law of Inertia)", "Second Law (F = ma)", "Third Law (Action & Reaction)", "Law of Universal Gravitation"],
              correctAnswer: "First Law (Law of Inertia)",
              explanation: "Newton's First Law defines inertia: velocity remains constant unless a resultant force acts on the mass.",
              points: 25
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: "A net force of 50 N is applied to a 10 kg mass. What is the acceleration produced?",
              options: ["0.2 m/s²", "5.0 m/s²", "500 m/s²", "25 m/s²"],
              correctAnswer: "5.0 m/s²",
              explanation: "From F = ma, a = F / m = 50 N / 10 kg = 5 m/s².",
              points: 25
            },
            {
              id: 'q3',
              type: 'multiple_choice',
              question: "When a bird pushes air downwards with its wings, what keeps it aloft according to Newton's Third Law?",
              options: ["Air pressure drops above the wing", "The air exerts an equal and opposite upward force on the bird", "Gravity is neutralized by kinetic energy", "Thermal updrafts only"],
              correctAnswer: "The air exerts an equal and opposite upward force on the bird",
              explanation: "Every action has an equal and opposite reaction: pushing air downward generates an upward reaction force.",
              points: 25
            },
            {
              id: 'q4',
              type: 'short_answer',
              question: "What is the SI unit of force?",
              correctAnswer: "Newton",
              explanation: "The SI unit of force is the Newton (N), equal to 1 kg·m/s².",
              points: 25
            }
          ]
        },
        {
          id: 'exam_js_async',
          title: "JavaScript Asynchronous Architecture & Event Loop",
          course: 'Full-Stack JavaScript',
          subject: 'Computer Science',
          description: 'Deep dive into microtasks, macrotasks, Promises, and async/await control flow.',
          durationMinutes: 25,
          passingScore: 75,
          totalPoints: 100,
          createdAt: new Date().toISOString(),
          questions: [
            {
              id: 'q_js_1',
              type: 'multiple_choice',
              question: "In the JavaScript event loop, which queue has priority for execution right after the current execution stack completes?",
              options: ["Macrotask Queue (setTimeout, setInterval)", "Microtask Queue (Promise.then, queueMicrotask)", "RequestAnimationFrame queue", "I/O Poll queue"],
              correctAnswer: "Microtask Queue (Promise.then, queueMicrotask)",
              explanation: "The microtask queue is drained completely before the event loop advances to process the next macrotask.",
              points: 30
            },
            {
              id: 'q_js_2',
              type: 'multiple_choice',
              question: "What does Promise.allSettled() return compared to Promise.all()?",
              options: [
                "Rejects immediately on the first rejection",
                "Resolves only when all promises resolve, otherwise rejects",
                "Returns an array describing the outcome of every promise, whether fulfilled or rejected",
                "Returns the first settled promise value"
              ],
              correctAnswer: "Returns an array describing the outcome of every promise, whether fulfilled or rejected",
              explanation: "Promise.allSettled waits for all promises to finish regardless of success or failure.",
              points: 35
            },
            {
              id: 'q_js_3',
              type: 'multiple_choice',
              question: "Under the hood, an 'async' function in JavaScript always returns what type?",
              options: ["A callback", "A Promise", "An EventEmitter", "A generator iterator"],
              correctAnswer: "A Promise",
              explanation: "Async functions wrap return values in Promise.resolve() and errors in Promise.reject().",
              points: 35
            }
          ]
        }
      ];
      await this.exams.insertMany(defaultExams);
      console.log('📚 [Database] Seeded default academic curriculum exams.');
    }
  }
}

export const db = RemlyDatabase.getInstance();
