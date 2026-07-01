import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { ReportInput } from '../types';
import { writeNotification } from './notifications';

export async function submitReport(reporterId: string, report: ReportInput): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reporterId,
    reportedUserId: report.reportedUserId,
    contentType: report.contentType,
    eventId: report.eventId,
    commentId: report.commentId,
    replyId: report.replyId,
    reason: report.reason,
    details: report.details || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // Notify the reportee that their content is under review
  writeNotification(report.reportedUserId, {
    type: 'content_under_review',
    fromUserId: 'system',
    fromDisplayName: 'Setly',
    message: 'Your post has been reported and is under review.',
  }).catch(err => console.warn('[reports] Failed to notify reportee:', err));

  // Notify all admins of the new report
  getDoc(doc(db, 'config', 'admins')).then(snap => {
    const adminUids: string[] = snap.exists() ? (snap.data().uids ?? []) : [];
    adminUids.forEach(uid => {
      writeNotification(uid, {
        type: 'new_report',
        fromUserId: 'system',
        fromDisplayName: 'Setly',
        message: `New report filed: ${report.reason} — ${report.contentType} content.`,
      }).catch(err => console.warn('[reports] Failed to notify admin:', err));
    });
  }).catch(err => console.warn('[reports] Failed to fetch admin config:', err));
}
