---
status: complete
phase: 05-team-owner-controls
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-03-05T01:00:00Z
updated: 2026-03-05T01:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Remove Member via Members Tab
expected: As team owner, open Team Settings > Members tab. Non-owner members show a three-dot menu. Click the menu on a member — "Remove" option appears. Click Remove — row swaps to inline confirmation with Confirm/Cancel buttons. Click Confirm — member row fades out with animation and disappears. Member count updates.
result: pass

### 2. View Pending Invitations in Members Tab
expected: Members tab shows pending invitations below active members. Each pending invitation shows a silhouette avatar, "Pending" badge, and relative time (e.g., "2 hours ago"). Email invitations show the email address. Link invitations show the link type.
result: pass

### 3. Manage Invitations (Resend/Revoke)
expected: Three-dot menu on a pending email invitation shows Resend and Revoke options. Clicking Resend re-sends the invitation. Clicking Revoke removes the invitation. Link invitations show Copy Link and Revoke options. Revoking a link auto-generates a new one.
result: pass

### 4. Leave Team
expected: As a non-owner member, open Team Settings. A "Leave team" button is visible (on Members tab and/or General tab). Click it — inline confirmation appears. Confirm — you are redirected to your personal workspace.
result: pass

### 5. Last-Owner Leave Guard
expected: As the sole owner of a team, the "Leave team" button either shows an error or is disabled, preventing you from leaving. You cannot leave a team where you are the only owner.
result: pass

### 6. Edit Team Name (Auto-Save)
expected: As team owner, open Team Settings > General tab. Team name is an editable input. Change the name and click away (blur). A brief green check/saved indicator appears. The name is persisted — reopening the modal shows the new name.
result: pass

### 7. Edit Team Slug with Conflict Handling
expected: As team owner, edit the team slug on the General tab. On blur, it auto-saves. If the slug conflicts with an existing team, an inline error appears and the slug reverts to the previous value.
result: pass

### 8. Delete Team (Danger Zone)
expected: As team owner, scroll to the bottom of the General tab. A red-bordered danger zone section shows a delete option. To confirm, you must type the exact team name. Once typed, the delete button enables. Clicking it deletes the team, and you are redirected to your personal workspace.
result: pass

### 9. Removed-Member Toast Notification
expected: When a member is removed from a team (by the owner), the next time they load the app, a toast notification appears saying "You were removed from {teamName}". The toast auto-dismisses after about 5 seconds.
result: pass

### 10. Non-Owner Read-Only General Tab
expected: As a regular (non-owner) member, open Team Settings > General tab. Team name and slug are displayed as read-only static text, not editable inputs. The delete danger zone is not visible.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
