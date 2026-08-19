import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StudentProfile, Subject, AttendanceRecord } from '../types';
import { attendancePercentage, attendanceBuffer, subjectRiskLevel, predictInternalMarks } from './ipuEngine';
import { Platform, Alert } from 'react-native';

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function generateIPUAttendancePDF(
  profile: StudentProfile,
  subjects: Subject[],
  records: AttendanceRecord[]
): Promise<void> {
  let totalAttended = 0;
  let totalClasses = 0;
  let totalCancelled = 0;
  let totalOD = 0;

  subjects.forEach(s => {
    totalAttended += s.attended;
    totalClasses += s.total;
    totalCancelled += s.cancelled;
    totalOD += s.od;
  });

  const overallPct = attendancePercentage(totalAttended, totalClasses);
  const internalMarks = predictInternalMarks(overallPct);
  const overallBuffer = attendanceBuffer(totalAttended, totalClasses, profile.targetAttendance || 75);

  const subjectRows = subjects
    .map((s, idx) => {
      const pct = attendancePercentage(s.attended, s.total);
      const risk = subjectRiskLevel(s.attended, s.total, s.targetRequirement || profile.targetAttendance || 75);
      const buf = attendanceBuffer(s.attended, s.total, s.targetRequirement || profile.targetAttendance || 75);
      const bufText = buf >= 0 ? `+${buf}` : `${buf}`;
      const statusColor = pct >= 75 ? '#10B981' : pct >= 65 ? '#F59E0B' : '#EF4444';
      const statusBg = pct >= 75 ? 'rgba(16, 185, 129, 0.15)' : pct >= 65 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 10px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 600; color: #0f172a;">${escapeHtml(s.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHtml(s.code)} • ${escapeHtml(s.type)} (${escapeHtml(s.ltp || '3-0-0')})</div>
          </td>
          <td style="padding: 10px 8px; text-align: center; color: #334155;">${escapeHtml(s.faculty || '—')}</td>
          <td style="padding: 10px 8px; text-align: center; font-weight: 500;">${s.attended} / ${s.total}</td>
          <td style="padding: 10px 8px; text-align: center; color: #64748b;">${s.od || 0}</td>
          <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 14px;">${pct}%</td>
          <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: ${buf >= 0 ? '#10B981' : '#EF4444'};">${bufText}</td>
          <td style="padding: 10px 8px; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${statusBg}; color: ${statusColor};">
              ${escapeHtml(risk.label)}
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Attendly — Personal Attendance Statement</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 32px;
            color: #0f172a;
            background: #ffffff;
          }
          .header-box {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .subtitle {
            font-size: 13px;
            color: #475569;
            margin-top: 4px;
          }
          .profile-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .profile-item {
            font-size: 12px;
          }
          .profile-label {
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
          }
          .profile-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            margin-top: 2px;
          }
          .stats-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-card {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .stat-val {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
          }
          .stat-lbl {
            font-size: 11px;
            color: #475569;
            text-transform: uppercase;
            margin-top: 4px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 700;
            padding: 10px 8px;
            text-align: center;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="title">${escapeHtml(profile.college) || 'GGSIPU'}</div>
            <div class="subtitle">${escapeHtml(profile.collegeShort) || ''} • Attendly Attendance Statement</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b;">Generated Date</div>
            <div style="font-weight: 700; font-size: 13px;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="profile-grid">
          <div class="profile-item">
            <div class="profile-label">Student Name</div>
            <div class="profile-value">${escapeHtml(profile.name) || 'Student'}</div>
          </div>
          <div class="profile-item">
            <div class="profile-label">Enrollment / Roll No.</div>
            <div class="profile-value">${escapeHtml(profile.enrollmentNumber || profile.rollNumber) || 'Not Specified'}</div>
          </div>
          <div class="profile-item">
            <div class="profile-label">Programme & Branch</div>
            <div class="profile-value">${escapeHtml(profile.programme)} ${escapeHtml(profile.branch)}</div>
          </div>
          <div class="profile-item">
            <div class="profile-label">Semester & Section</div>
            <div class="profile-value">Semester ${profile.semester} • Section ${escapeHtml(profile.section)}</div>
          </div>
          <div class="profile-item">
            <div class="profile-label">Academic Session</div>
            <div class="profile-value">${escapeHtml(profile.academicSession)}</div>
          </div>
          <div class="profile-item">
            <div class="profile-label">Minimum Target</div>
            <div class="profile-value" style="color: #0284c7;">${profile.targetAttendance || 75}% Minimum</div>
          </div>
        </div>

        <div class="stats-cards">
          <div class="stat-card" style="background: ${overallPct >= 75 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${overallPct >= 75 ? '#a7f3d0' : '#fecaca'};">
            <div class="stat-val" style="color: ${overallPct >= 75 ? '#059669' : '#dc2626'};">${overallPct}%</div>
            <div class="stat-lbl">Overall Attendance</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${totalAttended} / ${totalClasses}</div>
            <div class="stat-lbl">Lectures Attended</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: ${overallBuffer >= 0 ? '#059669' : '#dc2626'};">${overallBuffer >= 0 ? `+${overallBuffer}` : overallBuffer}</div>
            <div class="stat-lbl">${overallBuffer >= 0 ? 'Safe Bunk Buffer' : 'Shortage Deficit'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-val" style="color: #6366f1;">${internalMarks.marks} / 5</div>
            <div class="stat-lbl">Internal Marks Projection</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="text-align: left;">Course Title & Code</th>
              <th>Faculty</th>
              <th>Attended / Total</th>
              <th>OD/ECA</th>
              <th>Official %</th>
              <th>Buffer</th>
              <th>IPU Status</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
          </tbody>
        </table>

        <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #334155; margin-bottom: 24px;">
          <strong>Official IPU Attendance Clause Notice:</strong> As per GGSIPU Ordinance 11, candidates must secure minimum 75% attendance in aggregate and in individual courses to be eligible to appear for End-Term University Semester Examinations.
        </div>

        <div class="footer">
          <div>Attendly • Personal Attendance Statement (Self-Reported) • ${escapeHtml(profile.college) || 'GGSIPU'}</div>
          <div>Page 1 of 1 • System Generated Academic Ledger</div>
        </div>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        const sanitizedCollege = (profile.collegeShort || 'College').replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedName = (profile.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${sanitizedCollege}_Attendance_Report_${sanitizedName}.pdf`,
        });
      } else {
        Alert.alert(
          'Attendance Statement Generated',
          `Your official PDF statement was generated successfully at:\n\n${uri}\n\nTo share or print, please ensure a file viewer or sharing application is installed on your device.`,
          [{ text: 'OK' }]
        );
      }
    }
  } catch (error) {
    console.error('Error generating PDF report:', error);
    Alert.alert('Export Error', 'Unable to generate PDF report. Please try again.');
  }
}
