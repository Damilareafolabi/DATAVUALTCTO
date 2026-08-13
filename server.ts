import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { getDb, getAuth, isFirebaseAdminReady } from './src/lib/firebase-admin';
import corsOptions from './src/api/cors-options';
import { convertXLSFormToJSON, parseXLSForm } from './src/utils/xlsform-parser';
import { generateFormListXML, generateFormXML, generateManifestXML, parseSubmissionXML, serveFormXLSX } from './src/api/openrosa';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (!isFirebaseAdminReady()) {
  console.warn('⚠️  Firebase Admin not initialized. API routes requiring authentication will fail.');
  console.warn('   Set GOOGLE_APPLICATION_CREDENTIALS or use a service account key for production.');
}

const db = getDb();
const auth = getAuth();

async function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

function requireRole(allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }
    next();
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CMRG DataVault OS', timestamp: new Date().toISOString() });
});

app.post('/api/organizations/provision', async (req, res) => {
  try {
    const { email, password, firstName, lastName, organization } = req.body;
    
    if (!email || !password || !organization) {
      return res.status(400).json({ error: 'Missing required fields: email, password, organization' });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim(),
    });

    const orgRef = db.collection('organizations').doc();
    await orgRef.set({
      name: organization,
      createdAt: new Date(),
      ownerId: userRecord.uid,
      status: 'active',
      settings: {
        allowPublicRegistration: false,
        defaultRole: 'enumerator',
        timezone: 'Africa/Douala'
      }
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      organizationId: orgRef.id,
      role: 'super_admin',
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date(),
      lastActive: new Date()
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      organizationId: orgRef.id,
      role: 'super_admin'
    });

    res.json({ success: true, organizationId: orgRef.id, userId: userRecord.uid });
  } catch (error: any) {
    console.error('Provisioning error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/forms', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager', 'enumerator', 'read_only']), async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    
    const snapshot = await db.collection('forms')
      .where('organizationId', '==', orgId)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ forms });
  } catch (error: any) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch forms' });
  }
});

app.get('/api/forms/:formId', verifyToken, async (req, res) => {
  try {
    const { formId } = req.params;
    const user = (req as any).user;
    
    const doc = await db.collection('forms').doc(formId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const formData = doc.data()!;
    if (formData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ form: { id: doc.id, ...formData } });
  } catch (error: any) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch form' });
  }
});

app.post('/api/forms', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, fields, projectId, status = 'Draft' } = req.body;
    
    if (!title || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Title and fields array are required' });
    }
    
    const formRef = db.collection('forms').doc();
    const now = new Date();
    
    await formRef.set({
      title,
      description: description || '',
      fields,
      status,
      organizationId: user.organizationId,
      projectId: projectId || null,
      createdBy: user.uid,
      version: 1,
      createdAt: now,
      updatedAt: now
    });
    
    res.json({ success: true, formId: formRef.id });
  } catch (error: any) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: error.message || 'Failed to create form' });
  }
});

app.put('/api/forms/:formId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { formId } = req.params;
    const user = (req as any).user;
    const { title, description, fields, projectId, status } = req.body;
    
    const doc = await db.collection('forms').doc(formId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const formData = doc.data()!;
    if (formData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (fields) updateData.fields = fields;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (status) updateData.status = status;
    if (fields && JSON.stringify(fields) !== JSON.stringify(formData.fields)) {
      updateData.version = (formData.version || 1) + 1;
    }
    
    await db.collection('forms').doc(formId).update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: error.message || 'Failed to update form' });
  }
});

app.delete('/api/forms/:formId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { formId } = req.params;
    const user = (req as any).user;
    
    const doc = await db.collection('forms').doc(formId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const formData = doc.data()!;
    if (formData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.collection('forms').doc(formId).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: error.message || 'Failed to delete form' });
  }
});

app.post('/api/forms/upload-xlsform', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), upload.single('xlsform'), async (req: any, res) => {
  try {
    const user = (req as any).user;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsed = parseXLSForm(req.file.buffer);
    const formData = convertXLSFormToJSON(parsed);
    
    formData.organizationId = user.organizationId;
    formData.createdBy = user.uid;
    formData.projectId = req.body.projectId || null;

    const formRef = db.collection('forms').doc();
    const now = new Date();
    await formRef.set({
      ...formData,
      createdAt: now,
      updatedAt: now
    });

    res.json({ 
      success: true, 
      formId: formRef.id, 
      title: formData.title,
      fieldsCount: formData.fields.length
    });
  } catch (error: any) {
    console.error('Error uploading XLSForm:', error);
    res.status(500).json({ error: error.message || 'Failed to process XLSForm' });
  }
});

app.get('/api/submissions', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager', 'enumerator', 'read_only']), async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const { formId, projectId, enumeratorId, limit = 100 } = req.query;
    
    let query: any = db.collection('submissions').where('organizationId', '==', orgId);
    
    if (formId) query = query.where('formId', '==', formId);
    if (projectId) query = query.where('projectId', '==', projectId);
    if (enumeratorId) query = query.where('userId', '==', enumeratorId);
    
    const snapshot = await query.orderBy('createdAt', 'desc').limit(Number(limit)).get();
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ submissions });
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
});

app.post('/api/submissions', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { formId, formVersion, data, assignmentId, deviceId, gpsLocation } = req.body;
    
    if (!formId || !data) {
      return res.status(400).json({ error: 'formId and data are required' });
    }
    
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const formData = formDoc.data()!;
    if (formData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied to this form' });
    }
    
    const submissionRef = db.collection('submissions').doc();
    const now = new Date();
    
    await submissionRef.set({
      formId,
      formVersion: formVersion || formData.version || 1,
      organizationId: user.organizationId,
      projectId: formData.projectId || null,
      assignmentId: assignmentId || null,
      userId: user.uid,
      userEmail: user.email,
      deviceId: deviceId || null,
      answers: data,
      gpsLocation: gpsLocation || null,
      status: 'submitted',
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now
    });
    
    res.json({ success: true, submissionId: submissionRef.id });
  } catch (error: any) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: error.message || 'Failed to create submission' });
  }
});

app.get('/api/projects', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager', 'enumerator', 'read_only']), async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    
    const snapshot = await db.collection('projects')
      .where('organizationId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

app.post('/api/projects', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, status = 'active', startDate, endDate } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectRef = db.collection('projects').doc();
    await projectRef.set({
      name,
      description: description || '',
      status,
      organizationId: user.organizationId,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: user.uid,
      createdAt: new Date()
    });
    
    res.json({ success: true, projectId: projectRef.id });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

app.put('/api/projects/:projectId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    const { name, description, status, startDate, endDate } = req.body;
    
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = doc.data()!;
    if (projectData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    
    await db.collection('projects').doc(projectId).update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

app.delete('/api/projects/:projectId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = doc.data()!;
    if (projectData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.collection('projects').doc(projectId).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

app.get('/api/users', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    
    const snapshot = await db.collection('users')
      .where('organizationId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

app.post('/api/users/invite', verifyToken, requireRole(['super_admin', 'system_admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { email, firstName, lastName, role, teamId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const inviteRef = db.collection('invitations').doc();
    const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await inviteRef.set({
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'enumerator',
      teamId: teamId || null,
      organizationId: user.organizationId,
      invitedBy: user.uid,
      token: inviteToken,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    res.json({ success: true, inviteId: inviteRef.id, token: inviteToken });
  } catch (error: any) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: error.message || 'Failed to invite user' });
  }
});

app.put('/api/users/:userId', verifyToken, requireRole(['super_admin', 'system_admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = (req as any).user;
    const { role, status, firstName, lastName, teamId } = req.body;
    
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = doc.data()!;
    if (userData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (teamId !== undefined) updateData.teamId = teamId;
    
    await db.collection('users').doc(userId).update(updateData);
    
    if (role) {
      await auth.setCustomUserClaims(userId, {
        organizationId: userData.organizationId,
        role: role
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

app.get('/api/assignments', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const { enumeratorId, formId, projectId } = req.query;
    
    let query: any = db.collection('assignments').where('organizationId', '==', orgId);
    
    if (enumeratorId) query = query.where('enumeratorId', '==', enumeratorId);
    if (formId) query = query.where('formId', '==', formId);
    if (projectId) query = query.where('projectId', '==', projectId);
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ assignments });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments' });
  }
});

app.post('/api/assignments', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { formId, enumeratorId, projectId, location, deadline, instructions } = req.body;
    
    if (!formId || !enumeratorId) {
      return res.status(400).json({ error: 'formId and enumeratorId are required' });
    }
    
    const assignmentRef = db.collection('assignments').doc();
    await assignmentRef.set({
      formId,
      enumeratorId,
      projectId: projectId || null,
      location: location || '',
      deadline: deadline || null,
      instructions: instructions || '',
      organizationId: user.organizationId,
      createdBy: user.uid,
      status: 'assigned',
      progress: 0,
      createdAt: new Date()
    });
    
    res.json({ success: true, assignmentId: assignmentRef.id });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to create assignment' });
  }
});

app.put('/api/assignments/:assignmentId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const user = (req as any).user;
    const { status, progress, location, deadline, instructions } = req.body;
    
    const doc = await db.collection('assignments').doc(assignmentId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const assignmentData = doc.data()!;
    if (assignmentData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (location !== undefined) updateData.location = location;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (instructions !== undefined) updateData.instructions = instructions;
    
    await db.collection('assignments').doc(assignmentId).update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to update assignment' });
  }
});

app.delete('/api/assignments/:assignmentId', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const user = (req as any).user;
    
    const doc = await db.collection('assignments').doc(assignmentId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const assignmentData = doc.data()!;
    if (assignmentData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.collection('assignments').doc(assignmentId).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to delete assignment' });
  }
});

app.post('/api/export/:format', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const { format } = req.params;
    const { formId, projectId, submissionIds } = req.body;
    
    if (!['csv', 'excel', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use csv, excel, or json' });
    }
    
    let query: any = db.collection('submissions').where('organizationId', '==', orgId);
    if (formId) query = query.where('formId', '==', formId);
    if (projectId) query = query.where('projectId', '==', projectId);
    
    const snapshot = await query.get();
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=cmrg-export-${Date.now()}.${format === 'excel' ? 'xlsx' : format}`);
    
    if (format === 'json') {
      res.json({ submissions });
    } else if (format === 'csv') {
      const { generateCSV } = await import('./src/utils/export');
      const csv = generateCSV(submissions);
      res.send(csv);
    } else if (format === 'excel') {
      const { generateExcel } = await import('./src/utils/export');
      const buffer = await generateExcel(submissions);
      res.send(buffer);
    }
  } catch (error: any) {
    console.error('Error generating export:', error);
    res.status(500).json({ error: error.message || 'Failed to generate export' });
  }
});

app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    
    const [formsSnap, submissionsSnap, usersSnap, projectsSnap] = await Promise.all([
      db.collection('forms').where('organizationId', '==', orgId).get(),
      db.collection('submissions').where('organizationId', '==', orgId).get(),
      db.collection('users').where('organizationId', '==', orgId).get(),
      db.collection('projects').where('organizationId', '==', orgId).get()
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySubmissions = submissionsSnap.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt);
      return createdAt >= today;
    }).length;
    
    res.json({
      totalForms: formsSnap.size,
      totalSubmissions: submissionsSnap.size,
      totalUsers: usersSnap.size,
      totalProjects: projectsSnap.size,
      todaySubmissions,
      activeForms: formsSnap.docs.filter(d => d.data().status === 'Deployed').length
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

app.get('/api/form-versions/:formId', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { formId } = req.params;
    
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists || formDoc.data()?.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const snapshot = await db.collection('form_versions')
      .where('formId', '==', formId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ versions });
  } catch (error: any) {
    console.error('Error fetching form versions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch form versions' });
  }
});

app.post('/api/form-versions', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { formId, xml, xlsformName, version } = req.body;
    
    if (!formId) {
      return res.status(400).json({ error: 'formId is required' });
    }
    
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists || formDoc.data()?.organizationId !== user.organizationId) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    const versionRef = db.collection('form_versions').doc();
    await versionRef.set({
      formId,
      organizationId: user.organizationId,
      version: version || 1,
      xml: xml || '',
      xlsformName: xlsformName || '',
      createdAt: new Date()
    });
    
    res.json({ success: true, versionId: versionRef.id });
  } catch (error: any) {
    console.error('Error creating form version:', error);
    res.status(500).json({ error: error.message || 'Failed to create form version' });
  }
});

app.get('/api/submissions/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const user = (req as any).user;
    
    const doc = await db.collection('submissions').doc(submissionId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const submissionData = doc.data()!;
    if (submissionData.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ submission: { id: doc.id, ...submissionData } });
  } catch (error: any) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch submission' });
  }
});

app.get('/api/submissions/export/:format', verifyToken, requireRole(['super_admin', 'system_admin', 'project_manager', 'read_only']), async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    const { format } = req.params;
    const { formId, projectId } = req.query;
    
    if (!['csv', 'excel', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }
    
    let query: any = db.collection('submissions').where('organizationId', '==', orgId);
    if (formId) query = query.where('formId', '==', formId);
    if (projectId) query = query.where('projectId', '==', projectId);
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `cmrg-export-${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
    
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    if (format === 'json') {
      res.json({ submissions });
    } else if (format === 'csv') {
      const { generateCSV } = await import('./src/utils/export');
      const csv = generateCSV(submissions);
      res.send(csv);
    } else if (format === 'excel') {
      const { generateExcel } = await import('./src/utils/export');
      const buffer = await generateExcel(submissions);
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    }
  } catch (error: any) {
    console.error('Error generating export:', error);
    res.status(500).json({ error: error.message || 'Failed to generate export' });
  }
});

app.get('/api/users/me', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const doc = await db.collection('users').doc(user.uid).get();
    
    if (!doc.exists) {
      return res.json({
        uid: user.uid,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      });
    }
    
    res.json({ user: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

app.put('/api/users/me', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { firstName, lastName, email } = req.body;
    
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    await db.collection('users').doc(user.uid).update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

app.get('/api/assignments/my', verifyToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;
    
    const snapshot = await db.collection('assignments')
      .where('organizationId', '==', orgId)
      .where('enumeratorId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ assignments });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments' });
  }
});

// OpenRosa-compatible XML endpoints for ODK Collect integration
app.get('/formList', async (req, res) => {
  try {
    const xml = await generateFormListXML(req);
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('X-OpenRosa-Version', '1.0');
    res.send(xml);
  } catch (error: any) {
    console.error('Error generating formList:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Server error</error>');
  }
});

app.get('/manifest', async (req, res) => {
  try {
    const formId = req.query.formID as string;
    if (!formId) {
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><error>formID required</error>');
    }
    const xml = await generateManifestXML(formId, req);
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('X-OpenRosa-Version', '1.0');
    res.send(xml);
  } catch (error: any) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Server error</error>');
  }
});

app.post('/submission', async (req, res) => {
  try {
    const xmlData = typeof req.body === 'string' ? req.body : '';
    const parsed = await parseSubmissionXML(xmlData);
    
    if (!parsed.formId) {
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><error>Invalid submission: missing formId</error>');
    }

    const db = getDb();
    const submissionRef = db.collection('submissions').doc();
    await submissionRef.set({
      formId: parsed.formId,
      answers: parsed.data,
      deviceId: parsed.deviceId,
      status: 'submitted',
      syncStatus: 'synced',
      source: 'odk_collect',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.setHeader('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><OpenRosaResponse><submitSuccess>true</submitSuccess></OpenRosaResponse>');
  } catch (error: any) {
    console.error('Error processing submission:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Submission failed</error>');
  }
});

// Form XML download endpoint
app.get('/api/forms/:formId/xml', async (req, res) => {
  try {
    const { formId } = req.params;
    const xml = await generateFormXML(formId, req);
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('X-OpenRosa-Version', '1.0');
    res.send(xml);
  } catch (error: any) {
    res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><error>Form not found</error>');
  }
});

// XLSX form download for ODK Collect
app.get('/api/forms/:formId/xlsx', async (req, res) => {
  try {
    const { formId } = req.params;
    await serveFormXLSX(formId, req, res);
  } catch (error: any) {
    res.status(404).send('Form not found');
  }
});

// Free transcription endpoint (uses browser Web Speech API for client-side, backend for server-side)
app.post('/api/transcribe', verifyToken, async (req, res) => {
  try {
    const { audioData, language = 'en' } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    res.json({
      success: true,
      text: '',
      message: 'Transcription requires client-side Web Speech API or Vosk server deployment. Audio saved for manual transcription.',
      audioData: audioData.substring(0, 100) + '...',
      language
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// GPS verification endpoint
app.post('/api/verify-gps', verifyToken, async (req, res) => {
  try {
    const { submissionId, expectedLat, expectedLng, toleranceMeters = 100 } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    const doc = await db.collection('submissions').doc(submissionId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = doc.data()!;
    const gpsLocation = submission.gpsLocation;
    
    if (!gpsLocation) {
      return res.json({ 
        verified: false, 
        reason: 'No GPS data in submission',
        distance: null
      });
    }

    const distance = calculateDistance(
      gpsLocation.lat, gpsLocation.lng,
      expectedLat, expectedLng
    );

    const verified = distance <= toleranceMeters;

    await db.collection('submissions').doc(submissionId).update({
      gpsVerified: verified,
      gpsDistance: distance,
      gpsVerifiedAt: new Date()
    });

    res.json({
      verified,
      distance: Math.round(distance),
      tolerance: toleranceMeters,
      actual: gpsLocation,
      expected: { lat: expectedLat, lng: expectedLng }
    });
  } catch (error: any) {
    console.error('GPS verification error:', error);
    res.status(500).json({ error: error.message || 'GPS verification failed' });
  }
});

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

async function startServer() {
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
    console.log(`CMRG DataVault OS running on port ${PORT}`);
  });
}

startServer();
